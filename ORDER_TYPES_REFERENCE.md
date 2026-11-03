# Order Types Reference & Mechanics Guide
## Project: MarketMaster Academy
**Author**: Trading Technology & Microstructure Group  
**Version**: 1.0.0  

---

### 1. Standard Order Types

#### 1.1 Market Order
* **Definition**: An order to buy or sell immediately at the best available current price in the order book.
* **Execution Priority**: Highest execution priority. Guarantees immediate execution, but does NOT guarantee price.
* **Risk**: High vulnerability to slippage, spread widening, and flash spikes during illiquid market conditions.

#### 1.2 Limit Order
* **Definition**: An order to buy or sell at a specified price or better.
* **Execution Priority**: Queued behind existing orders at that price tick (Price-Time Priority). Guarantees price, but does NOT guarantee execution if market turns away before the order reaches front of queue.

#### 1.3 Stop-Loss Market (SL-M)
* **Definition**: A conditional order that activates as a Market Order as soon as the market price crosses the designated Trigger Price.
* **Execution Priority**: Passive until triggered. Once triggered, converts to aggressive Market Order.

#### 1.4 Stop-Loss Limit (SL-L)
* **Definition**: A conditional order that activates as a Limit Order at the specified Limit Price once the market price reaches the Trigger Price.
* **Risk**: If price violently gaps through the limit price, the order may remain unfilled, leaving the trader with an unprotected open loss.

---

### 2. Advanced & Conditional Order Types

#### 2.1 Bracket Order (BO)
* Combines an initial entry order with two simultaneous exit orders: a target profit leg and a stop-loss protection leg.
* Operates on an OCO (One-Cancels-the-Other) basis: if target fills, stop loss is automatically canceled.

#### 2.2 Cover Order (CO)
* Intraday order requiring a mandatory Stop-Loss price at placement, enabling lower margin requirements under broker RMS rules.

#### 2.3 GTT (Good Till Triggered)
* Long-term standing conditional order that remains active until triggered by market price crossing, valid for up to 1 year or until contract expiry.

#### 2.4 Iceberg Order
* Slices a large parent quantity into smaller visible "Display" lots. As each display lot fills, the next lot is automatically refreshed in the order book, preventing market panic.

