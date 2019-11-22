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
                <div style={{display:"flex",flexDirection:"column",height:"100%"}} id="main">
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
                      <div style={{display:"flex"}}>
                          <p style={{margin:"10px",borderRadius:"10px",marginLeft:"auto",backgroundColor:"blue",padding:"10px",maxWidth:"40vw",wordWrap:"break-word"}}>{data.name+": "+data.text}</p>
                      </div>
                  )
              } else {
                  var chat = (
                      <div style={{display:"flex"}}>
                          <p style={{margin:"10px",borderRadius:"10px",marginRight:"auto",backgroundColor:"grey",padding:"10px",maxWidth:"40vw",wordWrap:"break-word"}}>{data.name+": "+data.text}</p>
                      </div>
                  )
              }
              var buff = this.state.chat;
              buff.push(chat);
              this.setState({"chat":buff});
              window.scrollTo(0,document.body.scrollHeight);
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