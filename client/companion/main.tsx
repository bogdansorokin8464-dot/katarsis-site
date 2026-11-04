import { createRoot } from "react-dom/client";
import { App } from "./App";
const root = document.createElement("div");
root.id = "katarsis-companion-react";
document.body.append(root);
createRoot(root).render(<App />);
