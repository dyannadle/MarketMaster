# Relational Database Schema Specification
## Project: MarketMaster Academy
**RDBMS**: PostgreSQL 16+ (Compatible with TimescaleDB & SQLite)  
**Schema Version**: 1.0.0  

---

### 1. Entity-Relationship Overview & DDL Definitions

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PROFILES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'MODERATOR')),
    skill_rating INT DEFAULT 1200,
    skill_rd DECIMAL(6,2) DEFAULT 350.00, -- Glicko Rating Deviation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. COURSES & LESSONS HIERARCHY
CREATE TABLE courses (
    id VARCHAR(100) PRIMARY KEY,
    level INT NOT NULL CHECK (level BETWEEN 0 AND 5),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE concepts (
    id VARCHAR(100) PRIMARY KEY,
    course_id VARCHAR(100) REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    theory_markdown TEXT NOT NULL,
    formula_latex TEXT,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    order_index INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_concept_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    concept_id VARCHAR(100) REFERENCES concepts(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    quiz_score INT DEFAULT 0,
    attempts INT DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, concept_id)
);

-- 3. VIRTUAL ACCOUNTS & LEDGER
CREATE TABLE virtual_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(50) DEFAULT 'STANDARD' CHECK (account_type IN ('STANDARD', 'RATED_GYM', 'DAILY_CHALLENGE')),
    initial_balance DECIMAL(15,2) DEFAULT 1000000.00, -- ₹10,00,000 default
    cash_balance DECIMAL(15,2) DEFAULT 1000000.00,
    margin_blocked DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES virtual_accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'TRADE_BUY', 'TRADE_SELL', 'BROKERAGE', 'STT', 'EXCHANGE_FEE', 'GST', 'STAMP_DUTY', 'MTM_SETTLEMENT')),
    amount DECIMAL(15,2) NOT NULL, -- Negative for debits, positive for credits
    running_balance DECIMAL(15,2) NOT NULL,
    reference_id UUID, -- Links to order_id or fill_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SIMULATED ORDERS & EXECUTIONS
CREATE TABLE simulated_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES virtual_accounts(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    asset_class VARCHAR(50) NOT NULL CHECK (asset_class IN ('EQUITY', 'FUTURES', 'OPTIONS', 'COMMODITY', 'FOREX')),
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'SL_MARKET', 'SL_LIMIT', 'BRACKET')),
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('MIS', 'CNC', 'NRML')),
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,4),
    trigger_price DECIMAL(15,4),
    filled_quantity DECIMAL(15,4) DEFAULT 0.00,
    average_fill_price DECIMAL(15,4) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED')),
    stop_loss_price DECIMAL(15,4),
    take_profit_price DECIMAL(15,4),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulated_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES simulated_orders(id) ON DELETE CASCADE,
    account_id UUID REFERENCES virtual_accounts(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    fill_quantity DECIMAL(15,4) NOT NULL,
    fill_price DECIMAL(15,4) NOT NULL,
    slippage_ticks INT DEFAULT 0,
    brokerage DECIMAL(10,2) DEFAULT 0.00,
    stt DECIMAL(10,2) DEFAULT 0.00,
    total_tax DECIMAL(10,2) DEFAULT 0.00,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. POSITIONS
CREATE TABLE virtual_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES virtual_accounts(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    product_type VARCHAR(20) NOT NULL,
    net_quantity DECIMAL(15,4) NOT NULL,
    buy_quantity DECIMAL(15,4) DEFAULT 0.00,
    buy_average DECIMAL(15,4) DEFAULT 0.00,
    sell_quantity DECIMAL(15,4) DEFAULT 0.00,
    sell_average DECIMAL(15,4) DEFAULT 0.00,
    realized_pnl DECIMAL(15,2) DEFAULT 0.00,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, symbol, product_type)
);

-- 6. MARKET DATA CANDLE STORE
CREATE TABLE historical_candles (
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL, -- '1m', '5m', '15m', '1h', '1d'
    bucket_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open_price DECIMAL(15,4) NOT NULL,
    high_price DECIMAL(15,4) NOT NULL,
    low_price DECIMAL(15,4) NOT NULL,
    close_price DECIMAL(15,4) NOT NULL,
    volume DECIMAL(18,2) NOT NULL,
    PRIMARY KEY (symbol, timeframe, bucket_timestamp)
);
```

---

### 2. Indexes & Performance Optimization
```sql
CREATE INDEX idx_user_progress ON user_concept_progress(user_id, is_completed);
CREATE INDEX idx_orders_account ON simulated_orders(account_id, status);
CREATE INDEX idx_ledger_account ON cash_ledger(account_id, created_at DESC);
CREATE INDEX idx_candles_lookup ON historical_candles(symbol, timeframe, bucket_timestamp DESC);
```

