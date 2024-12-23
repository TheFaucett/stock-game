import React, { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch the message from the backend
    fetch('http://localhost:5000/api/message') // Use full URL to your backend
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message); // Set the message in state
      })
      .catch((error) => console.error('Error fetching message:', error));
  }, []);

  return (
    <div className="App">
      <h1>Message from Backend:</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
