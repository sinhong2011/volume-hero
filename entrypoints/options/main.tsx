import { render } from "solid-js/web";

import "./style.css";
import Options from "./Options";

const root = document.getElementById("root");
if (root) {
  render(() => <Options />, root);
}
