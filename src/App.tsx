/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CanvasDashboard } from "./components/CanvasDashboard";
import { ThemeProvider } from "./lib/ThemeContext";
import { Wallpaper } from "./components/Wallpaper";

export default function App() {
  return (
    <ThemeProvider>
      <Wallpaper />
      <CanvasDashboard />
    </ThemeProvider>
  );
}
