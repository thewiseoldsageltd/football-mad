import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { applyArticleBootstrapToQueryClient } from "./lib/article-bootstrap";

applyArticleBootstrapToQueryClient(queryClient);

createRoot(document.getElementById("root")!).render(<App />);
