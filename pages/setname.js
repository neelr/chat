import Layout from "../component/Layout";

export default class SetName extends React.Component {
    render () {
        return (
            <Layout>
                <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
                    <div style={{margin:"auto", backgroundColor:"blue",padding:"20px",borderRadius:"20px"}}>
                        <h1>Set your name!</h1>
                        <input id="name" type="text" placeholder="Name"/>
                        <br/>
                        <button id="send">Send me to chat!</button>
                    </div>
                </div>
            </Layout>
        )
    }
    componentDidMount () {
        document.getElementById("send").onclick = () => {
            if (document.getElementById("name").value != "") {
                window.localStorage.setItem("name",document.getElementById("name").value);
                window.location = "/";
            }
        }
    }
}