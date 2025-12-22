/**
 * On-Screen Display (OSD) for volume changes
 */

let osdElement: HTMLDivElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

const OSD_STYLES = `
  position: fixed;
  top: 50px;
  right: 50px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18px;
  font-weight: 600;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
  pointer-events: none;
`;

/**
 * Create or get the OSD element
 */
function getOSDElement(): HTMLDivElement {
  if (!osdElement || !document.body.contains(osdElement)) {
    osdElement = document.createElement("div");
    osdElement.id = "volume-hero-osd";
    osdElement.style.cssText = OSD_STYLES;
    osdElement.style.opacity = "0";
    osdElement.style.transform = "translateY(-10px)";
    document.body.appendChild(osdElement);
  }
  return osdElement;
}

/**
 * Get volume icon based on level
 */
function getVolumeIcon(volumePercent: number, isMuted: boolean): string {
  if (isMuted || volumePercent === 0) return "🔇";
  if (volumePercent < 50) return "🔈";
  if (volumePercent < 150) return "🔉";
  return "🔊";
}

/**
 * Get progress bar color based on volume level
 */
function getProgressColor(volumePercent: number): string {
  if (volumePercent <= 100) return "#4ade80"; // green
  if (volumePercent <= 200) return "#facc15"; // yellow
  if (volumePercent <= 400) return "#fb923c"; // orange
  return "#f87171"; // red
}

/**
 * Show the OSD with volume information
 */
export function showVolumeOSD(
  volumePercent: number,
  isMuted: boolean = false,
  duration: number = 1500
): void {
  const osd = getOSDElement();

  const icon = getVolumeIcon(volumePercent, isMuted);
  const displayValue = isMuted ? "Muted" : `${Math.round(volumePercent)}%`;
  const progressColor = getProgressColor(volumePercent);
  const progressWidth = Math.min(100, (volumePercent / 600) * 100);

  // Clear existing content
  osd.textContent = "";

  // Create icon span
  const iconSpan = document.createElement("span");
  iconSpan.style.cssText = "font-size: 24px;";
  iconSpan.textContent = icon;

  // Create content container
  const contentDiv = document.createElement("div");
  contentDiv.style.cssText = "display: flex; flex-direction: column; gap: 6px; min-width: 120px;";

  // Create header row
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display: flex; justify-content: space-between; align-items: center;";

  const labelSpan = document.createElement("span");
  labelSpan.style.cssText = "font-size: 12px; opacity: 0.7;";
  labelSpan.textContent = "Volume Hero";

  const valueSpan = document.createElement("span");
  valueSpan.textContent = displayValue;

  headerRow.appendChild(labelSpan);
  headerRow.appendChild(valueSpan);

  // Create progress bar container
  const progressContainer = document.createElement("div");
  progressContainer.style.cssText =
    "background: rgba(255,255,255,0.2); border-radius: 4px; height: 6px; overflow: hidden;";

  const progressBar = document.createElement("div");
  progressBar.style.cssText = `background: ${progressColor}; height: 100%; width: ${progressWidth}%; transition: width 0.1s ease-out; border-radius: 4px;`;

  progressContainer.appendChild(progressBar);

  // Assemble the OSD
  contentDiv.appendChild(headerRow);
  contentDiv.appendChild(progressContainer);
  osd.appendChild(iconSpan);
  osd.appendChild(contentDiv);

  // Show with animation
  requestAnimationFrame(() => {
    osd.style.opacity = "1";
    osd.style.transform = "translateY(0)";
  });

  // Clear existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }

  // Hide after duration
  hideTimeout = setTimeout(() => {
    osd.style.opacity = "0";
    osd.style.transform = "translateY(-10px)";
  }, duration);
}

/**
 * Hide the OSD immediately
 */
export function hideVolumeOSD(): void {
  if (osdElement) {
    osdElement.style.opacity = "0";
    osdElement.style.transform = "translateY(-10px)";
  }
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

/**
 * Remove the OSD element from DOM
 */
export function destroyOSD(): void {
  if (osdElement && document.body.contains(osdElement)) {
    document.body.removeChild(osdElement);
  }
  osdElement = null;
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}
