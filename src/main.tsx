import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { applyTheme } from "./lib/theme";
import { loadTheme } from "./lib/storage";
import { Home } from "./routes/Home";
import { Layout } from "./routes/Layout";
import { NotFoundMessage } from "./routes/Messages";
import { PuzzlePage } from "./routes/PuzzlePage";
import "./styles/tokens.css";
import "./styles/app.css";

applyTheme(loadTheme());

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="p/:puzzleNo" element={<PuzzlePage />} />
            <Route path="*" element={<NotFoundMessage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
);
