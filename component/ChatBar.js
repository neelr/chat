export default class ChatBar extends React.Component {
    render() {
        return(
            <div style={{display:"flex",flexDirection:"row"}}>
                <input id="text" type="text" placeholder="Message"/>
                <button id="sendButton">Send</button>
                <style jsx>{`
                input {
                    width:90vw;
                    height:30px;
                    font-size:1em;
                }
                button {
                    width:10vw;
                    background-color:#14b2ff;
                    padding: 0;
                    border: none;
                    font-size:1.3em;
                    color:white;
                }
                button:active {
                    background-color:#0c4759;
                }
                `}</style>
            </div>
        )
    }
}