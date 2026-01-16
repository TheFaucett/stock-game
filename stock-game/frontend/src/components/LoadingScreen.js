export default function LoadingScreen() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#0f172a",
      color: "#e2e8f0",
      fontFamily: "system-ui, sans-serif",
    }}>
      <h1>Loading Simulation...</h1>
      <p>Spinning up market systems ⏳</p>
    </div>
  );
}
