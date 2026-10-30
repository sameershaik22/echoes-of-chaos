# 🎮 ECHOES OF CHAOS

> **A real-time multiplayer social deduction and codebreaking party game.**
> *Trust your instincts. Decode the chaos. Survive the round.*

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-23%2F23%20Passing-brightgreen.svg)]()

---

## ✦ Overview

**Echoes of Chaos** is a real-time multiplayer browser game designed for **2 to 8 players**. Players collaborate to decode a secret 4-symbol sequence generated each round using private clues.

* **Cooperative Mode (2–3 Players):** Pure cooperative deduction where all clues are truthful. Teams work together, propose sequences, and confirm answers to score points.
* **Social Deduction Mode (4–8 Players):** In larger groups, one player is secretly designated as the **Disruptor**. The Disruptor receives plausible misleading clues designed to derail the team. After answer submission, players enter the Accusation Phase to identify and vote out the Disruptor!

---

## 🎯 Gameplay Mechanics

### 1. The Clue System
Every player receives private pieces of intelligence based on 5 mathematical and positional types:

1. **Exact-Position Clues:** *"Position 2 is Diamond"*
2. **Exclusion Clues:** *"Position 1 is NOT Square"*
3. **Parity Clues:** *"Position 3 is an EVEN number"*
4. **Arithmetic Clues:** *"Sum of Position 1 and Position 4 is 7"*
5. **Frequency Clues:** *"Circle appears exactly 1 time"*

A **brute-force Constraint Satisfaction Problem (CSP) solver** ensures that the truthful clue set distributed to innocent teammates mathematically guarantees **exactly one unique solution**.

### 2. The Disruptor Contradiction
When playing with 4+ players:
* The Disruptor receives **1 truthful clue** (a shared piece of truth) and **1 misleading clue**.
* The misleading clue is mathematically crafted to produce **0 valid solutions** when combined with the truthful clues, creating a detectable contradiction during team discussion!

### 3. Submission Flow: Propose → Confirm → Lock
* Any teammate can construct and propose a 4-symbol sequence during the **Submission Phase (15s)**.
* Teammates review the active proposal and confirm it.
* A 3-second proposal cooldown prevents spam, and new proposals are locked out in the final 3 seconds.
* Once a **majority of connected players** confirm, the proposal **locks immediately**.

### 4. Scoring & Tie-Breaking
* **Team Success:** +500 points to innocent players for correct sequence.
* **Disruptor Sabotage:** +500 points to the Disruptor if team fails or submits nothing.
* **Accusation Voting:**
  * Correctly identifying the Disruptor: **+200 points**
  * Wrongly accusing an innocent teammate: **-100 points**
  * Disruptor evading detection: **+200 points** to the Disruptor
* **Fair Tie-Breaking:** Evaluated strictly by:
  1. Total individual score
  2. Total correct Disruptor identifications
  3. Shared rank (e.g. Tied players both receive Rank 1, next is Rank 3)

---

## 🛠 Tech Stack

* **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand, Vite
* **Backend:** Node.js, Express, Socket.IO
* **Audio:** Web Audio API (real-time synthesized SFX, zero audio file dependencies, auto-unlock on user gesture)
* **Testing:** Vitest (unit tests, integration tests, 500+ generated puzzle stress tests)
* **Deployment:** Production-ready single-service bundle with `render.yaml` blueprint

---

## 🚀 Quick Start

### Prerequisites
* Node.js >= 20.0.0
* npm >= 9.0.0

### Installation
```bash
git clone https://github.com/sameershaik22/echoes-of-chaos.git
cd echoes-of-chaos
npm install
```

### Running in Development
Starts Vite client (port 5173) and tsx server watcher (port 3001) concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Tests
Execute the comprehensive Vitest suite (CSP solver, clue generator, scoring, room management, integration, and puzzle stress tests):
```bash
npm test
```

### Production Build & Run
```bash
npm run build
npm start
```
The server will start on port `3001` (or `$PORT`) and serve the built client application and health check at `/api/health`.

---

## 🌐 Deployment to Render

The repository includes a ready-to-use [`render.yaml`](./render.yaml) blueprint:

1. Push your repository to GitHub.
2. Link the repository to [Render.com](https://render.com).
3. Render automatically reads `render.yaml`, runs `npm install && npm run build`, and starts the unified Node.js web service.

> **Note on Render Free Tier:**
> Inactivity spins down free tier instances after ~15 minutes. The initial request experiences a 30–60s cold start. In-memory rooms and active matches reset upon restart.

---

## 📜 License
MIT License. Crafted with precision for real-time multiplayer social deduction.
