import io from "socket.io-client";
import Layout from "../component/Layout";
import ChatBar from "../component/ChatBar";
import emoji from "node-emoji";
import mark  from "marked";

export default class Index extends React.Component {
    state = {
        chat:[]
    }
    render () {
        return (
            <Layout>
                <div style={{display:"flex",position:"fixed",width:"100vw",height:"50px", backgroundColor:"#203d59",top:0}}>
                    <p style={{margin:"auto"}} id="type"></p>
                </div>
                <div style={{height:"100%",display:"flex",flexDirection:"column"}} id="main">
                    <div id="chat" style={{display:"flex",flexDirection:"column",marginTop:"auto",overflow:"auto"}}>
                        {this.state.chat}
                    </div>
                    <div>
                        <ChatBar/>
                    </div>
                </div>
            </Layout>
        )
    }
    componentDidMount () {
        var onMissing = function (name) {
            return name;
        };
    if ("Notification" in window) {
        Notification.requestPermission();
    }
        if (window.location.search == "?lounge") {
            window.location = "/";
        }
        document.getElementById("type").innerHTML = window.location.search != "" ? window.location.search.split("?")[1] : "lounge";
        if (window.localStorage.getItem("id") == null) {
          window.localStorage.setItem("id", Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        }
        if (window.localStorage.getItem("name") == null) {
            var name = "";
            while (name == "") {
              name = prompt("Please enter a nickname!","John Doe");
            }
            window.localStorage.setItem("name",name)
        }
        this.socket = io();
        document.getElementById("type").onclick =  () => {
            this.socket.disconnect();
            var name = "";
            while (name == "") {
              name = prompt("Please enter a nickname!","John Doe");
            }
            window.localStorage.setItem("name",name)
            this.socket.connect();
            this.socket.emit("person",{"name":window.localStorage.getItem("name"),"room":window.location.search})
        }
        this.socket.emit("person",{"name":window.localStorage.getItem("name"),"room":window.location.search})
        document.getElementById("sendButton").onclick = () => {
            if (document.getElementById("text").value != "") {
                this.socket.emit("message",{text:document.getElementById("text").value,"name":window.localStorage.getItem("name"),"id":window.localStorage.getItem("id"),"room":window.location.search})
            }
            document.getElementById("text").value = "";
        }
        window.addEventListener('keypress', (e) => {
            if (e.keyCode == 13) {
                if (document.getElementById("text").value != "") {
                    this.socket.emit("message",{text:document.getElementById("text").value,"name":window.localStorage.getItem("name"),"id":window.localStorage.getItem("id"),"room":window.location.search})
                }
                document.getElementById("text").value = "";
            }
        }, false);
        this.socket.on("new", (data) => {
            if (window.location.search == data.room) {
              if (data.id == window.localStorage.getItem("id")) {
                  var chat = (
                      <div style={{marginLeft:"auto",maxWidth:"40vw"}}>
                          <div style={{margin:"10px",borderRadius:"10px",backgroundColor:"blue",padding:"10px",wordWrap:"break-word",display:"block"}} dangerouslySetInnerHTML={{__html:mark(data.name+": "+emoji.emojify(data.text, onMissing))}}></div>
                      </div>
                  )
              } else {
                  if ("Notification" in window) {
                  if (document.hidden && Notification.permission === "granted") {
                      new Notification(data.name+": "+data.text)
                  }}
                  var chat = (
                      <div style={{marginRight:"auto",maxWidth:"40vw"}}>
                          <p style={{margin:"10px",borderRadius:"10px",backgroundColor:"grey",padding:"10px",wordWrap:"break-word",display:"block"}} dangerouslySetInnerHTML={{__html:mark(data.name+": "+emoji.emojify(data.text, onMissing))}}></p>
                      </div>
                  )
              }
              var buff = this.state.chat;
              buff.push(chat);
              this.setState({"chat":buff});
              document.getElementById("chat").scrollTo(0,document.getElementById("chat").scrollHeight);
            }
        })
        this.socket.on("newper", (data) => {
            if (window.location.search == data.room) {
                var chat = (
                    <div style={{display:"flex",height:"50px"}}>
                        <p style={{margin:"auto",color:"green"}}>{data.name+" has joined the room!"}</p>
                    </div>
                )
                var buff = this.state.chat;
                buff.push(chat);
                this.setState({"chat":buff});
            }
        })
    }
}