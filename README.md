# CMB_spherical_harmonics

# Spherical Harmonics

An interactive educational website for exploring spherical harmonics and some of their applications in physics.

The site began as a way to visualize individual spherical harmonics and developed into a collection of interactive models showing how the same mathematics appears in several different physical systems.

## Features

* Interactive 3D spherical harmonics with adjustable (\ell) and (m)
* A simulated Cosmic Microwave Background sky built from spherical harmonics
* Planck CMB temperature power-spectrum data
* A spherical-harmonic model of a supernova remnant
* An approximate Earth-like magnetic-field model
* Mouse and touch interaction with the 3D models
* * An interactive explanation of the mathematics behind spherical harmonics

## How it works

The website runs primarily in the browser using HTML, CSS, and JavaScript.

Three.js and WebGL are used for the 3D visualizations. The CMB map is rendered with the HTML Canvas API, with some of the heavier spherical-harmonic calculations performed in a Web Worker.

Planck CMB power-spectrum data are stored locally as text files rather than accessed through a live external API.

## Running locally

Clone or download the repository, then start a local web server from the project directory. For example:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

in a web browser.

A local server is required because browsers restrict some file loading and Web Worker behavior when HTML files are opened directly from the filesystem.

## Purpose

This project is an exploratory and educational tool to make spherical harmonics easier to see, manipulate, and connect to physical examples.

## Data

CMB temperature power-spectrum data are from the Planck mission's public data releases.

## Technologies

* HTML
* CSS
* JavaScript
* Three.js
* WebGL
* HTML Canvas
* Web Workers

## Author

Jonathan Byrd
