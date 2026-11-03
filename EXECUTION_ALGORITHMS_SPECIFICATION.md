# Execution Algorithms Specification
## Project: MarketMaster Academy
**Author**: Quantitative Execution & Microstructure Engineering  
**Version**: 1.0.0  

---

### 1. The 13 Core Institutional Execution Algorithms

#### 1. Time-Weighted Average Price (TWAP)
* **Goal**: Minimize market impact by dividing order into equal sized child orders executed at evenly spaced intervals over duration $T$.
* **Algorithm**:
  $$\text{Interval} = \frac{T}{N}, \quad \text{Child Qty} = \frac{\text{Total Quantity}}{N}$$
* **Variance Jitter**: Adds $\pm 10\%$ random time jitter to prevent HFT detection.

#### 2. Volume-Weighted Average Price (VWAP)
* **Goal**: Match the historical volume distribution profile of the trading day.
* **Algorithm**:
  $$\text{Child Qty}_i = \text{Total Quantity} \times \left(\frac{V_{i,\text{hist}}}{\sum V_{\text{hist}}}\right)$$

#### 3. Percentage of Volume (POV)
* **Goal**: Participate as a fixed percentage of total market volume as it occurs.
* **Algorithm**:
  $$\text{Child Qty}_t = \min\left(\text{Remaining Qty}, \text{Market Volume}_t \times \frac{\text{Participation Rate}}{100}\right)$$

#### 4. POV Price Band
* Extends POV by establishing an upper bound ($P_{\max}$) and lower bound ($P_{\min}$) collar. If market price violates the band, execution pauses immediately.

#### 5. POV Slot and Distributor
* Distributes execution into micro time-slots (e.g. 30 seconds), accumulating child order sizes based on dynamic volume shifts across the slot window.

#### 6. TWAP + POV Hybrid
* Blends fixed-interval TWAP pacing with volume acceleration: if volume expands, participation rate ramps up to capture liquidity without pushing prices.

#### 7. Iceberg Order & Display Size
* Displays a fraction of true size (e.g. 100 shares out of 10,000) on the order book. When filled, next tranche is exposed.

#### 8. Smart Incognito
* Obfuscates execution pattern by randomizing slice size, price offset, and interval frequency, preventing predatory algorithms from front-running.

#### 9. Liquidity Seeker
* Aggressively sweeps non-displayed or dark pools and tests multiple price levels with small probes before deploying full size.

#### 10. Predictive Size
* Uses short-term machine learning / autoregressive volume forecasting to anticipate upcoming volume spikes and pre-emptively size orders.

#### 11. Reference-Based Execution
* Links child order pricing dynamically to a benchmark index (e.g., Bank Nifty or underlying future) with a fixed basis offset.

#### 12. Normal Bidding & Bidding for Best
* **Normal Bidding**: Posts passive bid at current Best Bid.
* **Bidding for Best**: Automatically outbids competing buyers by 1 tick ($P_{\text{best}} + \text{Tick}$) to claim queue priority while remaining within a price cap.

#### 13. Cash-Futures Arbitrage
* Identifies mispricings between spot stock price ($S_t$) and future price ($F_t$).
* Fair Value: $F^* = S_t \times e^{(r - q)T}$.
* If $F_t > F^* + \text{Costs}$: Buy Spot, Sell Future (Cash & Carry Arbitrage).
* At expiry, $F_T = S_T$, guaranteeing risk-free profit.

