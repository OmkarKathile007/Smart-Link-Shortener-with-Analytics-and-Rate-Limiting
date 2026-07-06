import { useState,useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios
    .get("http://localhost:5000")
    .then((res)=>setMessage(res.data.message))
    .catch((err)=>console.log(err));
  }, []);

  return (
    <>
      
    <div style={{ padding: "40px" }}>
      <h1>Smart Link Shortener</h1>
      <p>{message}</p>
    </div>
    </>
  )
}

export default App
