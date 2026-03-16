interface Env {
  CHAT_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const id = env.CHAT_ROOM.idFromName("main");
      const room = env.CHAT_ROOM.get(id);
      return room.fetch(request);
    }

    if (url.pathname === "/") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

export class ChatRoom implements DurableObject {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;

    let data: any;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    const sockets = this.state.getWebSockets();

    switch (data.type) {
      case "join": {
        // Attach identity to this socket
        ws.serializeAttachment({ id: data.id, publicKey: data.publicKey });

        // Tell this peer about all existing peers
        const peers: { id: string; publicKey: string }[] = [];
        for (const s of sockets) {
          if (s === ws) continue;
          const att = s.deserializeAttachment();
          if (att?.id) peers.push({ id: att.id, publicKey: att.publicKey });
        }
        ws.send(JSON.stringify({ type: "peers", peers }));

        // Broadcast the new join to everyone else
        for (const s of sockets) {
          if (s === ws) continue;
          s.send(JSON.stringify({
            type: "peer-join",
            id: data.id,
            publicKey: data.publicKey,
          }));
        }
        break;
      }

      case "offer":
      case "answer":
      case "ice-candidate": {
        // Relay signaling to a specific peer by id
        for (const s of sockets) {
          const att = s.deserializeAttachment();
          if (att?.id === data.target) {
            const att2 = ws.deserializeAttachment();
            s.send(JSON.stringify({ ...data, from: att2?.id }));
            break;
          }
        }
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment();
    if (!att?.id) return;

    const sockets = this.state.getWebSockets();
    for (const s of sockets) {
      if (s === ws) continue;
      s.send(JSON.stringify({ type: "peer-leave", id: att.id }));
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>chat.neelr.dev</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; background: #fff; color: #222; height: 100vh; display: flex; flex-direction: column; font-size: 14px; }
  #header { padding: 4px 8px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; }
  #header .status { display: flex; align-items: center; gap: 4px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #ccc; display: inline-block; }
  .dot.online { background: #22c55e; }
  #messages { flex: 1; overflow-y: auto; padding: 4px 8px; }
  .msg { word-break: break-word; white-space: pre-wrap; cursor: pointer; }
  .msg.copied { background: #f0f0f0; }
  .msg .id { font-weight: bold; }
  .msg .time { color: #999; }
  .msg.system { color: #999; }
  #input-bar { border-top: 1px solid #ccc; display: flex; height: 33vh; position: relative; }
  #input-bar textarea { flex: 1; background: #fff; border: none; color: #222; padding: 8px; padding-right: 48px; font-family: monospace; font-size: 14px; line-height: 1.4; outline: none; resize: none; overflow-y: auto; }
  #send { position: absolute; bottom: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%; background: #2563eb; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  #send:hover { background: #1d4ed8; }
  #send svg { fill: #fff; width: 16px; height: 16px; }
</style>
</head>
<body>
<div id="header">
  <span>chat.neelr.dev</span>
  <div class="status"><span class="dot" id="dot"></span><span id="peer-count">connecting...</span></div>
</div>
<div id="messages"></div>
<div id="input-bar">
  <textarea id="input" placeholder="type a message..." autocomplete="off"></textarea>
  <button id="send"><svg viewBox="0 0 24 24"><path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z"/></svg></button>
</div>

<script>
(async () => {
  // --- Crypto identity ---
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const pubKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const pubKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const hashBuf = await crypto.subtle.digest("SHA-256", pubKeyRaw);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const myId = hashArr.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
  const myPubKeyB64 = btoa(String.fromCharCode(...new Uint8Array(pubKeyRaw)));

  // Color from identity hash
  function idColor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    return "hsl(" + (Math.abs(h) % 360) + ", 70%, 35%)";
  }

  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("input");
  const dotEl = document.getElementById("dot");
  const peerCountEl = document.getElementById("peer-count");

  function addMessage(id, text, system) {
    const div = document.createElement("div");
    div.className = "msg" + (system ? " system" : "");
    if (system) {
      div.textContent = "* " + text;
    } else {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      div.innerHTML = '<span class="time">' + time + ' </span><span class="id" style="color:' + idColor(id) + '">&lt;' + id + '&gt;</span> ';
      const span = document.createElement("span");
      span.textContent = text;
      div.appendChild(span);
    }
    if (!system) {
      div.onclick = () => {
        navigator.clipboard.writeText(text);
        div.classList.add("copied");
        setTimeout(() => div.classList.remove("copied"), 300);
      };
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // --- Peer connections ---
  const peers = {}; // id -> { pc, dc, publicKey }
  const peerKeys = {}; // id -> CryptoKey (public)

  function updatePeerCount() {
    const count = Object.keys(peers).length;
    peerCountEl.textContent = (count + 1) + " peer" + (count !== 0 ? "s" : "");
    dotEl.className = "dot online";
  }

  async function importPubKey(b64) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  }

  async function signMessage(text) {
    const enc = new TextEncoder().encode(text);
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, enc);
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  }

  async function verifyMessage(text, sigB64, pubKey) {
    try {
      const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
      const enc = new TextEncoder().encode(text);
      return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pubKey, sig, enc);
    } catch { return false; }
  }

  async function sendChat(text) {
    if (!text.trim()) return;
    const sig = await signMessage(text);
    const payload = JSON.stringify({ id: myId, text, sig });
    for (const pid of Object.keys(peers)) {
      const p = peers[pid];
      if (p.dc && p.dc.readyState === "open") {
        p.dc.send(payload);
      }
    }
    addMessage(myId, text, false);
  }

  async function handleDcMessage(e) {
    try {
      const data = JSON.parse(e.data);
      const pubKey = peerKeys[data.id];
      if (!pubKey) return;
      const valid = await verifyMessage(data.text, data.sig, pubKey);
      if (valid) addMessage(data.id, data.text, false);
      else addMessage(data.id, "[unverified] " + data.text, false);
    } catch {}
  }

  const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  function createPeerConnection(peerId, initiator) {
    const pc = new RTCPeerConnection(rtcConfig);
    const peer = { pc, dc: null, publicKey: null };
    peers[peerId] = peer;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({ type: "ice-candidate", target: peerId, candidate: e.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupPeer(peerId);
      }
    };

    if (initiator) {
      const dc = pc.createDataChannel("chat");
      peer.dc = dc;
      dc.onmessage = handleDcMessage;
      dc.onopen = () => { addMessage(null, peerId + " connected", true); };
    } else {
      pc.ondatachannel = (e) => {
        peer.dc = e.channel;
        e.channel.onmessage = handleDcMessage;
        e.channel.onopen = () => { addMessage(null, peerId + " connected", true); };
      };
    }

    updatePeerCount();
    return pc;
  }

  function cleanupPeer(id) {
    const p = peers[id];
    if (p) {
      if (p.dc) p.dc.close();
      p.pc.close();
      delete peers[id];
      delete peerKeys[id];
      updatePeerCount();
    }
  }

  // --- WebSocket signaling ---
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(proto + "//" + location.host + "/ws");

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", id: myId, publicKey: myPubKeyB64 }));
    addMessage(null, "you are " + myId, true);
    updatePeerCount();
  };

  ws.onclose = () => {
    dotEl.className = "dot";
    peerCountEl.textContent = "disconnected";
    addMessage(null, "disconnected from signaling server", true);
  };

  ws.onmessage = async (e) => {
    const data = JSON.parse(e.data);

    switch (data.type) {
      case "peers": {
        // Existing peers — we initiate connections to all of them
        for (const p of data.peers) {
          peerKeys[p.id] = await importPubKey(p.publicKey);
          const pc = createPeerConnection(p.id, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: "offer", target: p.id, sdp: offer }));
        }
        break;
      }

      case "peer-join": {
        // New peer joined — they will initiate, we just prepare
        peerKeys[data.id] = await importPubKey(data.publicKey);
        addMessage(null, data.id + " joined", true);
        updatePeerCount();
        break;
      }

      case "offer": {
        // Incoming offer — create connection and respond
        if (!peers[data.from]) {
          createPeerConnection(data.from, false);
        }
        const pc = peers[data.from].pc;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", target: data.from, sdp: answer }));
        break;
      }

      case "answer": {
        const p = peers[data.from];
        if (p) await p.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        break;
      }

      case "ice-candidate": {
        const p = peers[data.from];
        if (p) await p.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        break;
      }

      case "peer-leave": {
        addMessage(null, data.id + " left", true);
        cleanupPeer(data.id);
        break;
      }
    }
  };

  // --- UI ---
  inputEl.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(inputEl.value); inputEl.value = ""; } };
  document.getElementById("send").onclick = () => { sendChat(inputEl.value); inputEl.value = ""; inputEl.focus(); };
  inputEl.focus();
})();
</script>
</body>
</html>`;
