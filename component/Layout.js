export default class Layout extends React.Component {
    render () {
        return (
            <div style={{height:"100%"}}>
                <title>chat</title>
                {this.props.children}
                <style jsx global>{`
                @import url('https://fonts.googleapis.com/css?family=Open+Sans:400,700,800&display=swap');
                body, html, #__next {
                    font-family: 'Open Sans', sans-serif;
                    height:100%;
                    margin:0;
                    background-color:#333639;
                    color:white;
                }
                p {
                    margin:0;
                }
                a {
                    color:#00fff3;
                    text-decoration:none;
                }
                a:hover {
                    text-decoration:underline;
                }
                `}</style>
            </div>
        )
    }
} 