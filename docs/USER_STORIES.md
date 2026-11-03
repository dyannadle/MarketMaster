# User Stories & Acceptance Criteria
## Project: MarketMaster Academy
**Methodology**: Agile / Scrum Epics  
**Version**: 1.0.0  

---

### Epic 1: Beginner Financial Education
* **US-01 (Learn Compounding)**:
  * *As a* beginner investor,
  * *I want to* adjust initial investment, monthly contribution, and return rates on an interactive compounding calculator,
  * *So that* I can visually see how interest accumulates over 10, 20, and 30 years.
  * **Acceptance Criteria**: Changing sliders updates the SVG graph in real-time; formula and inflation-adjusted real value displayed.
* **US-02 (Concept Quiz)**:
  * *As a* student,
  * *I want to* answer a 4-question quiz at the end of each lesson,
  * *So that* I can verify my understanding and unlock the next lesson.
  * **Acceptance Criteria**: $\ge 3$ out of 4 correct answers required to pass; each option reveals clear explanation upon selection.

---

### Epic 2: Realistic Paper Trading
* **US-03 (Place Limit Order)**:
  * *As a* retail trader,
  * *I want to* place a Buy Limit Order on NIFTY Index with attached Stop Loss and Take Profit,
  * *So that* my trade executes automatically without having to watch the screen constantly.
  * **Acceptance Criteria**: Order appears in "Open Orders"; when simulated price touches limit price, order fills and OCO bracket activates.
* **US-04 (Statutory Charges Breakdown)**:
  * *As a* trader,
  * *I want to* see the exact simulated Brokerage, STT, Exchange Fees, and GST on every trade fill,
  * *So that* I understand how turnover taxes impact real-world profitability.
  * **Acceptance Criteria**: Trade confirmation modal displays itemized fees matching official SEBI/NSE schedules.

---

### Epic 3: ChartingPark-Style Structured Practice Gym
* **US-05 (Blind Replay Practice)**:
  * *As a* technical trader,
  * *I want to* practice on historical charts where the asset name and date are hidden,
  * *So that* I cannot rely on hindsight memory and must trade purely on price action.
  * **Acceptance Criteria**: Symbol displayed as `ASSET_X`; X-axis shows `Bar N`; mandatory Stop-Loss enforced.
* **US-06 (Daily Challenge)**:
  * *As a* competitive learner,
  * *I want to* solve the 3 daily setups and view my score on the daily leaderboard,
  * *So that* I can compare my decision accuracy against other traders globally.
  * **Acceptance Criteria**: 3 setups available daily; scoring weights risk-to-reward ratio and invalidation discipline.

