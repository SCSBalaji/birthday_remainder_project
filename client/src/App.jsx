import React from 'react';

function App() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center",
      background: "#f8f9fa"
    }}>
      <h1>Birthday Remainder</h1>
      <p>Welcome! This app helps you remember your friends' and family's birthdays.</p>
      <p>Start by adding a birthday below!</p>
    </div>
  );
}

export default App;