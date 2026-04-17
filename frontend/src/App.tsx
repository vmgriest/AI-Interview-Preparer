import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import Interview from "./pages/Interview";
import History from "./pages/History";
import SessionReview from "./pages/SessionReview";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/interview/:sessionId" element={<Interview />} />
      <Route path="/history" element={<History />} />
      <Route path="/session/:sessionId" element={<SessionReview />} />
    </Routes>
  );
}
