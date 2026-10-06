# Sherboa Web

Frontend for **Sherboa**, a web-based tool for comparing video quality using objective video quality metrics.

## Overview

Sherboa Web provides the user interface for uploading reference and distorted video files, running quality analysis, and visualizing the results.

The frontend communicates with the Sherboa Engine API and presents the analysis in a simple interface designed for broadcast and streaming workflows.

The application is built as a lightweight static web frontend and is deployed at [sherboa.com](https://sherboa.com).

## Features

- Upload reference and distorted video files
- Run video quality analysis through the Sherboa Engine API
- Display VMAF, PSNR, and SSIM results
- Visualize per-frame VMAF and PSNR values
- Display average, minimum, and maximum metric values
- Download analysis results
- Responsive interface for desktop and mobile devices
- Dark developer-oriented UI

## Tech Stack

- **HTML5** — page structure and semantic markup
- **CSS3** — responsive layout and visual styling
- **JavaScript** — application logic and API communication
- **Chart.js** — visualization of video quality metrics
- **Google Fonts** — IBM Plex Mono typography

## Project Structure

```text
sherboa-web/
├── assets/
│   └── images/             # Images, icons, and brand assets
├── css/
│   └── style.css           # Main stylesheet
├── js/
│   └── analyze-video.js    # Video analysis and API interaction
├── pages/
│   ├── about.html
│   ├── analyze-video.html
│   ├── contact.html
│   └── how-it-works.html
├── index.html              # Main landing page
└── README.md
```

## How It Works

Sherboa Web provides a simple workflow for video quality analysis:

1. Select a reference video and a distorted video.
2. Upload both files through the analysis interface.
3. The frontend sends the videos to the Sherboa Engine API.
4. The API processes the videos and returns the quality metrics.
5. The results are displayed as summary values and per-frame charts.

The frontend does not perform the video quality analysis itself; it is responsible for the user interface, API communication, and visualization of the results.

## Configuration

The frontend communicates with the Sherboa Engine API at:

```text
https://sherboa-api.duckdns.org
```

The API endpoint is configured in:

```text
js/analyze-video.js
```

No backend credentials or secrets are required by the frontend.

## Development

Clone the repository and open the project directory:

```bash
git clone https://github.com/sherboa/sherboa-web.git
cd sherboa-web
```

The project is a static frontend and does not require a build system or package manager.

For local development, serve the project with any static HTTP server. For example:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deployment

Sherboa Web is deployed as a static website using **Netlify**.

The production site is available at:

https://sherboa.com

Changes pushed to the main branch are deployed through Netlify.

## Related Repositories

- **Sherboa Engine** — Backend API responsible for video quality analysis.
  https://github.com/sherboa/sherboa-engine

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.