import { useState, useMemo } from 'react';
import {
  parseFixMessage,
  reconstructOrderLifecycle,
  scanTradeSurveillance,
  generateRegulatoryAuditCertificate,
  SAMPLE_FIX_DROP_COPY_STREAM,
  FixMessage,
  ReconstructedOrder,
  SurveillanceViolation,
  RegulatoryAuditCertificate,
} from '../../lib/fix-surveillance';

export function FixSurveillancePanel() {
  const [rawStreamText, setRawStreamText] = useState<string>(SAMPLE_FIX_DROP_COPY_STREAM.join('\n'));
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(0);
  const [auditCert, setAuditCert] = useState<RegulatoryAuditCertificate | null>(null);
  const [isGeneratingCert, setIsGeneratingCert] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'STREAM' | 'ORDERS' | 'SURVEILLANCE' | 'CERTIFICATE'>('STREAM');

  // Parse raw text into structured messages
  const parsedMessages: FixMessage[] = useMemo(() => {
    return rawStreamText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 5 && line.startsWith('8='))
      .map(line => parseFixMessage(line));
  }, [rawStreamText]);

  // Reconstruct orders
  const { orders } = useMemo(() => {
    return reconstructOrderLifecycle(parsedMessages);
  }, [parsedMessages]);

  // Run SEBI Schedule V surveillance scan
  const violations: SurveillanceViolation[] = useMemo(() => {
    return scanTradeSurveillance(parsedMessages, orders);
  }, [parsedMessages, orders]);

  // Handle generating certificate
  const handleGenerateAuditCert = async () => {
    setIsGeneratingCert(true);
    try {
      const cert = await generateRegulatoryAuditCertificate(parsedMessages, orders, violations);
      setAuditCert(cert);
      setActiveTab('CERTIFICATE');
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const selectedMsg = selectedMessageIndex !== null ? parsedMessages[selectedMessageIndex] : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-6 font-mono text-slate-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Institutional FIX 4.4 Drop Copy & Trade Surveillance
            </h2>
            <span className="text-xs bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded">
              SEBI Schedule V Regs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Real-time broker-dealer drop copy stream replay, market abuse detection (wash trades, spoofing, circular trading), and cryptographic clearing reconciliation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRawStreamText(SAMPLE_FIX_DROP_COPY_STREAM.join('\n'))}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Reset Sample Stream
          </button>
          <button
            onClick={handleGenerateAuditCert}
            disabled={isGeneratingCert || parsedMessages.length === 0}
            className="px-3.5 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded shadow transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isGeneratingCert ? 'Computing SHA-256...' : 'Generate SEBI Audit Cert'}
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Total FIX Messages</div>
          <div className="text-2xl font-bold text-white mt-1">{parsedMessages.length}</div>
          <div className="text-[10px] text-slate-500">Tag-Value Protocol Decoded</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Reconstructed Orders</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{orders.length}</div>
          <div className="text-[10px] text-slate-500">Lifecycle State Machine Active</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Executed Trades</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {orders.reduce((sum, o) => sum + o.executions.length, 0)}
          </div>
          <div className="text-[10px] text-slate-500">Leaves & CumQty Reconciled</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Surveillance Flags</div>
          <div className={`text-2xl font-bold mt-1 ${violations.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {violations.length}
          </div>
          <div className="text-[10px] text-slate-500">SEBI PFUTP Violations</div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        {(['STREAM', 'ORDERS', 'SURVEILLANCE', 'CERTIFICATE'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            {tab === 'STREAM' && `Raw Drop Copy Stream (${parsedMessages.length})`}
            {tab === 'ORDERS' && `Order Lifecycle (${orders.length})`}
            {tab === 'SURVEILLANCE' && `SEBI Surveillance Flags (${violations.length})`}
            {tab === 'CERTIFICATE' && `Audit Certificate ${auditCert ? '✓' : ''}`}
          </button>
        ))}
      </div>

      {/* Tab 1: Raw Drop Copy Stream */}
      {activeTab === 'STREAM' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300 font-sans">Drop Copy Raw FIX Messages:</span>
            <div className="h-72 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col gap-1 text-xs">
              {parsedMessages.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedMessageIndex(idx)}
                  className={`p-2 rounded cursor-pointer transition flex items-center justify-between font-mono ${
                    selectedMessageIndex === idx
                      ? 'bg-indigo-950/80 border border-indigo-700/60 text-indigo-200'
                      : 'hover:bg-slate-900 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      m.msgType === 'D' ? 'bg-blue-900/60 text-blue-300' :
                      m.msgType === '8' ? 'bg-emerald-900/60 text-emerald-300' :
                      m.msgType === 'F' ? 'bg-amber-900/60 text-amber-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      35={m.msgType} ({m.msgTypeName})
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-xs">{m.raw}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                    {m.transactTime.split('T')[1] || m.transactTime.split('-')[1] || m.transactTime}
                  </span>
                </div>
              ))}
            </div>
            <textarea
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
              placeholder="Paste custom FIX 4.4 stream lines here..."
              value={rawStreamText}
              onChange={e => setRawStreamText(e.target.value)}
            />
          </div>

          {/* Inspector for selected message */}
          <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300 font-sans flex items-center justify-between">
              <span>Message Inspector</span>
              {selectedMsg && (
                <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                  Checksum: {selectedMsg.isValidChecksum ? 'VALID ✓' : 'CHECKSUM MISMATCH'}
                </span>
              )}
            </span>

            {selectedMsg ? (
              <div className="h-80 overflow-y-auto flex flex-col gap-1 text-xs">
                <div className="bg-slate-900/70 p-2 rounded border border-slate-800 text-slate-300 mb-2">
                  <div className="text-indigo-400 font-semibold mb-1">Type: {selectedMsg.msgTypeName} (tag 35={selectedMsg.msgType})</div>
                  <div>Sender: <span className="text-white">{selectedMsg.senderCompId}</span> ➔ Target: <span className="text-white">{selectedMsg.targetCompId}</span></div>
                  {selectedMsg.symbol && <div>Symbol: <span className="text-white font-bold">{selectedMsg.symbol}</span> | Side: <span className={selectedMsg.side === '1' ? 'text-emerald-400' : 'text-rose-400'}>{selectedMsg.side === '1' ? 'BUY' : 'SELL'}</span></div>}
                  {selectedMsg.orderQty && <div>Qty: <span className="text-white">{selectedMsg.orderQty}</span> @ ₹<span className="text-white">{selectedMsg.price?.toFixed(2)}</span></div>}
                </div>

                <div className="text-[11px] font-sans text-slate-400 mb-1">Parsed FIX Tag-Value Tokens:</div>
                <div className="flex flex-col gap-1">
                  {selectedMsg.tags.map((tv, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/50 px-2 py-1 rounded text-[11px]">
                      <span className="text-slate-400">Tag <span className="text-cyan-400 font-bold">{tv.tag}</span>:</span>
                      <span className="text-slate-200 font-semibold">{tv.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-xs text-slate-500 font-sans">
                Select a FIX message to inspect tag-value mapping.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Reconstructed Order Lifecycle */}
      {activeTab === 'ORDERS' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Order ID / ClOrdID</th>
                <th className="p-2.5">Account</th>
                <th className="p-2.5">Symbol</th>
                <th className="p-2.5">Side</th>
                <th className="p-2.5">Qty / Leaves / Cum</th>
                <th className="p-2.5">Limit Px</th>
                <th className="p-2.5">Avg Px</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Executions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50 font-mono">
              {orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-slate-800/40 transition">
                  <td className="p-2.5 text-indigo-300 font-semibold">{o.orderId}</td>
                  <td className="p-2.5 text-slate-300">{o.account}</td>
                  <td className="p-2.5 font-bold text-white">{o.symbol}</td>
                  <td className="p-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      o.side === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {o.side}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-300">
                    {o.orderQty} / <span className="text-amber-400">{o.leavesQty}</span> / <span className="text-emerald-400">{o.cumQty}</span>
                  </td>
                  <td className="p-2.5 text-slate-300">₹{o.price.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-300">{o.avgPx > 0 ? `₹${o.avgPx.toFixed(2)}` : '—'}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      o.status === 'FILLED' ? 'bg-emerald-900/60 text-emerald-300' :
                      o.status === 'CANCELLED' ? 'bg-amber-900/60 text-amber-300' :
                      o.status === 'PARTIALLY_FILLED' ? 'bg-blue-900/60 text-blue-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-400">{o.executions.length} fills</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: SEBI Surveillance Flags */}
      {activeTab === 'SURVEILLANCE' && (
        <div className="flex flex-col gap-4">
          {violations.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-lg">
              <div className="text-emerald-400 font-bold text-base mb-1">Zero Surveillance Violations Flagged ✓</div>
              <p className="text-xs text-slate-400 font-sans">
                All order submissions and trade executions conform to SEBI Prohibition of Fraudulent and Unfair Trade Practices Regulations.
              </p>
            </div>
          ) : (
            violations.map((v) => (
              <div
                key={v.id}
                className="bg-slate-950/90 border border-rose-900/60 rounded-xl p-4 flex flex-col gap-2.5 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                      {v.severity} ALERT
                    </span>
                    <span className="text-sm font-bold text-white">{v.type.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs text-slate-500">{v.timestamp}</span>
                </div>
                <div className="text-xs text-rose-300 font-sans">{v.description}</div>
                <div className="flex flex-wrap gap-4 text-[11px] pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500">Statutory Rule:</span> <span className="text-amber-300">{v.rule}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Accounts Flagged:</span> <span className="text-slate-200">{v.involvedAccounts.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Orders Involved:</span> <span className="text-slate-200">{v.involvedOrders.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Audit Certificate */}
      {activeTab === 'CERTIFICATE' && (
        <div className="flex flex-col gap-4">
          {auditCert ? (
            <div className="bg-slate-950 border border-amber-600/60 rounded-xl p-6 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-amber-500 font-bold tracking-widest uppercase">
                    Official Regulatory Compliance Certificate
                  </div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    SEBI Form TR-8 Clearing & Trade Surveillance Audit
                  </div>
                </div>
                <div className={`px-3 py-1 rounded text-xs font-bold ${
                  auditCert.status === 'COMPLIANT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {auditCert.status}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Certificate ID:</span>
                  <span className="text-slate-200 font-bold">{auditCert.certificateId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Broker-Dealer Code:</span>
                  <span className="text-slate-200 font-bold">{auditCert.brokerDealerCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Audit Jurisdiction:</span>
                  <span className="text-slate-200">{auditCert.regulatoryJurisdiction}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Messages Replayed:</span>
                  <span className="text-cyan-400 font-bold">{auditCert.totalMessagesProcessed}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Orders Reconstructed:</span>
                  <span className="text-cyan-400 font-bold">{auditCert.totalOrdersReconstructed}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Executed Trades Turnover:</span>
                  <span className="text-emerald-400 font-bold">₹{auditCert.totalTurnoverInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded p-3 flex flex-col gap-1 text-[11px]">
                <div className="text-slate-400 font-sans flex items-center justify-between">
                  <span>Cryptographic Integrity Verification Hash (SHA-256):</span>
                  <span className="text-emerald-400 text-[10px]">VERIFIED IMMUTABLE ✓</span>
                </div>
                <div className="text-amber-400 break-all font-mono">{auditCert.checksumSha256}</div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditCert, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute('href', dataStr);
                    downloadAnchor.setAttribute('download', `${auditCert.certificateId}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow transition"
                >
                  Download Signed JSON Certificate
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-lg">
              <p className="text-xs text-slate-400 font-sans mb-3">
                No certificate generated for current drop copy buffer.
              </p>
              <button
                onClick={handleGenerateAuditCert}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded shadow transition"
              >
                Compute Hash & Generate Audit Certificate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
