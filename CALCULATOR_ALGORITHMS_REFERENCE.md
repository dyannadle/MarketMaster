# Interactive Calculator Algorithms & Mathematics
## Project: MarketMaster Academy
**Component**: Client-Side Interactive Educational Widgets  
**Version**: 1.0.0  

---

### 1. Compounding & Future Value (TVM)
$$\text{Future Value} = P \times \left(1 + \frac{r}{n}\right)^{n \times t}$$
* $P$: Principal Initial Investment (₹)
* $r$: Annual Expected Nominal Rate of Return (decimal)
* $n$: Compounding frequency per year ($n=1$ annual, $n=12$ monthly, $n=365$ daily)
* $t$: Investment horizon in years

---

### 2. Systematic Investment Plan (SIP)
$$\text{SIP Future Value} = M \times \frac{(1 + i) \times \left[(1 + i)^N - 1\right]}{i}$$
* $M$: Monthly recurring investment amount (₹)
* $i$: Periodic monthly interest rate ($\frac{r}{12}$)
* $N$: Total number of monthly contributions ($12 \times t$)

---

### 3. Black-Scholes European Options Pricing Model & Greeks
$$d_1 = \frac{\ln(S / K) + \left(r - q + \frac{\sigma^2}{2}\right)T}{\sigma \sqrt{T}}, \quad d_2 = d_1 - \sigma \sqrt{T}$$

* **Call Price ($C$)**:
  $$C = S e^{-qT} N(d_1) - K e^{-rT} N(d_2)$$
* **Put Price ($P$)**:
  $$P = K e^{-rT} N(-d_2) - S e^{-qT} N(-d_1)$$
* **Option Greeks**:
  * **Delta ($\Delta$)**: Call $\Delta = e^{-qT} N(d_1)$, Put $\Delta = -e^{-qT} N(-d_1)$
  * **Gamma ($\Gamma$)**: $\Gamma = \frac{e^{-qT} N'(d_1)}{S \sigma \sqrt{T}}$
  * **Vega ($\nu$)**: $\nu = S e^{-qT} N'(d_1) \sqrt{T}$
  * **Theta ($\Theta$)**:
    $$\Theta_{\text{call}} = -\frac{S \sigma e^{-qT} N'(d_1)}{2 \sqrt{T}} - r K e^{-rT} N(d_2) + q S e^{-qT} N(d_1)$$
  * **Rho ($\rho$)**: $\rho_{\text{call}} = K T e^{-rT} N(d_2)$

---

### 4. Position Sizing & Risk of Ruin
$$\text{Position Quantity} = \left\lfloor \frac{\text{Account Capital} \times (\text{Risk \%} / 100)}{|\text{Entry Price} - \text{Stop Loss Price}|} \right\rfloor$$

#### Fixed Fraction Risk of Ruin Formula:
$$\text{Risk of Ruin} = \left(\frac{1 - A}{1 + A}\right)^U$$
* $A = (P_{\text{win}} \times R_{\text{win}}) - (P_{\text{loss}} \times R_{\text{loss}})$ (Trading Edge)
* $U$: Capital Units risked before bankruptcy

