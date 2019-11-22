import io from "socket.io-client";
import Layout from "../component/Layout";
import ChatBar from "../component/ChatBar";

export default class Index extends React.Component {
    state = {
        chat:[]
    }
    render () {
        return (
            <Layout>
                <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
                    <div style={{display:"flex",flexDirection:"column",marginTop:"auto"}}>
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
        if (window.localStorage.getItem("name") == null) {
            window.location = "/setname";
        }
        this.socket = io();
        document.getElementById("sendButton").onclick = () => {
            if (document.getElementById("text").value != "") {
                this.socket.emit("message",{text:document.getElementById("text").value,"name":window.localStorage.getItem("name")})
            }
            document.getElementById("text").value = "";
        }
        window.addEventListener('keypress', (e) => {
            if (e.keyCode == 13) {
                if (document.getElementById("text").value != "") {
                    this.socket.emit("message",{text:document.getElementById("text").value,"name":window.localStorage.getItem("name")})
                }
                document.getElementById("text").value = "";
            }
        }, false);
        this.socket.on("new", (data) => {
            if (data.name == window.localStorage.getItem("name")) {
                var chat = (
                    <div style={{display:"flex"}}>
                        <p style={{marginLeft:"auto",backgroundColor:"blue",padding:"10px",maxWidth:"40vw",wordWrap:"break-word"}}>{data.name+": "+data.text}</p>
                    </div>
                )
            } else {
                var chat = (
                    <div style={{display:"flex"}}>
                        <p style={{marginRight:"auto",backgroundColor:"grey",padding:"10px",maxWidth:"40vw",wordWrap:"break-word"}}>{data.name+": "+data.text}</p>
                    </div>
                )
            }
            var buff = this.state.chat;
            buff.push(chat);
            this.setState({"chat":buff});
        })
    }
}