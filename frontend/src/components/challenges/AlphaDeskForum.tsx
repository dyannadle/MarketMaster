import { useState } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  Award,
  Eye,
  MessageSquare,
  PlusCircle,
  ThumbsUp,
  Tag,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  ChartAnnotationSetup,
  POPULAR_SETUP_TAGS,
  calculateRiskRewardRatio,
  validateRule43Compliance,
  saveSetup,
  addPeerReview,
  getStoredSetups,
} from '../../lib/chart-annotations';

interface AlphaDeskProps {
  currentSymbol?: string;
  currentPrice?: number;
}

export function AlphaDeskForum({ currentSymbol = 'NIFTY50', currentPrice = 24500 }: AlphaDeskProps) {
  const [setups, setSetups] = useState<ChartAnnotationSetup[]>(() => getStoredSetups());
  const [isPublishing, setIsPublishing] = useState(false);
  const [authorHandle, setAuthorHandle] = useState('Anon_Trader');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice);
  const [stopLossPrice, setStopLossPrice] = useState<number>(Math.round(currentPrice * 0.992));
  const [targetPrice, setTargetPrice] = useState<number>(Math.round(currentPrice * 1.024));
  const [selectedTags, setSelectedTags] = useState<string[]>(['#BreakoutRetest']);
  const [thesis, setThesis] = useState('');

  // Peer review state
  const [reviewingSetupId, setReviewingSetupId] = useState<string | null>(null);
  const [reviewerHandle, setReviewerHandle] = useState('Senior_Risk_PM');
  const [clarityScore, setClarityScore] = useState(5);
  const [riskScore, setRiskScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const rrRatio = calculateRiskRewardRatio(entryPrice, stopLossPrice, targetPrice, side);
  const isRule43Valid = validateRule43Compliance(entryPrice, stopLossPrice);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesis.trim()) return;

    saveSetup({
      authorHandle: authorHandle.trim() || 'Anon_Trader',
      symbol: currentSymbol,
      timeframe: '5m',
      side,
      entryPrice,
      stopLossPrice,
      targetPrice,
      riskRewardRatio: rrRatio,
      rule43Compliant: isRule43Valid,
      tags: selectedTags,
      thesis: thesis.trim(),
    });

    setSetups(getStoredSetups());
    setIsPublishing(false);
    setThesis('');
  };

  const handleAddReview = (setupId: string) => {
    if (!reviewComment.trim()) return;
    addPeerReview(setupId, {
      reviewerHandle: reviewerHandle.trim() || 'Senior_Risk_PM',
      clarityScore,
      riskManagementScore: riskScore,
      pedagogicalComment: reviewComment.trim(),
    });

    setSetups(getStoredSetups());
    setReviewingSetupId(null);
    setReviewComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Alpha Desk: Peer Setup & Chart Annotation Review
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              PIP 5.2
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Institutional peer feedback forum. Share annotated entry/exit setups anonymously and get evaluated strictly on risk-reward discipline and structural invalidation clarity.
          </p>
        </div>
        <button
          onClick={() => setIsPublishing(!isPublishing)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          {isPublishing ? 'Cancel' : 'Share Trade Setup'}
        </button>
      </div>

      {/* Setup Publishing Modal / Drawer */}
      {isPublishing && (
        <form onSubmit={handlePublish} className="p-5 rounded-xl border border-primary/30 bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" /> Publish Annotated Setup ({currentSymbol})
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded font-mono font-bold ${isRule43Valid ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                {isRule43Valid ? 'Rule 4.3 Compliant (R ≤ 1.5%)' : 'Rule 4.3 Warning (R > 1.5%)'}
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-muted text-foreground">
                R:R 1:{rrRatio.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Anonymous Handle</label>
              <input
                type="text"
                value={authorHandle}
                onChange={(e) => setAuthorHandle(e.target.value)}
                className="mt-1 w-full text-xs p-2 rounded-md border border-input bg-background font-mono"
                placeholder="e.g. AnonDesk_42"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Side</label>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${side === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${side === 'SELL' ? 'bg-rose-600 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  SELL
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Entry Price</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full text-xs p-2 rounded-md border border-input bg-background font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Stop Loss & Target</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-md border border-rose-500/30 bg-background font-mono text-rose-500"
                  placeholder="SL"
                />
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-md border border-emerald-500/30 bg-background font-mono text-emerald-500"
                  placeholder="TP"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Setup Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SETUP_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${selectedTags.includes(tag) ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Thesis & Invalidation Criteria</label>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={3}
              placeholder="Detail your setup thesis, order block justification, and exact invalidation level..."
              className="mt-1 w-full text-xs p-2.5 rounded-md border border-input bg-background"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPublishing(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!thesis.trim()}
              className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
            >
              Publish to Alpha Desk
            </button>
          </div>
        </form>
      )}

      {/* Setup Feed */}
      <div className="grid grid-cols-1 gap-4">
        {setups.map((setup) => {
          const avgClarity = setup.peerReviews.length
            ? (setup.peerReviews.reduce((acc, r) => acc + r.clarityScore, 0) / setup.peerReviews.length).toFixed(1)
            : '—';
          const avgRisk = setup.peerReviews.length
            ? (setup.peerReviews.reduce((acc, r) => acc + r.riskManagementScore, 0) / setup.peerReviews.length).toFixed(1)
            : '—';

          return (
            <div key={setup.id} className="p-5 rounded-xl border border-border bg-card/70 hover:border-border/80 transition-all space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${setup.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {setup.side === 'BUY' ? <TrendingUp className="w-3.5 h-3.5 inline mr-1" /> : <TrendingDown className="w-3.5 h-3.5 inline mr-1" />}
                    {setup.side} {setup.symbol}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">@{setup.authorHandle}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground font-mono">{setup.timeframe}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-foreground">
                    R:R 1:{setup.riskRewardRatio}
                  </span>
                  {setup.rule43Compliant ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Rule 4.3 Passed
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> High Risk
                    </span>
                  )}
                </div>
              </div>

              {/* Price Targets Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-background/50 border border-border/40 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Entry</span>
                  <span className="font-bold text-foreground">₹{setup.entryPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 block uppercase">Stop Loss</span>
                  <span className="font-bold text-rose-500">₹{setup.stopLossPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-500 block uppercase">Target</span>
                  <span className="font-bold text-emerald-500">₹{setup.targetPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Setup Tags */}
              <div className="flex flex-wrap gap-1.5">
                {setup.tags.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" /> {t}
                  </span>
                ))}
              </div>

              {/* Thesis */}
              <p className="text-xs text-foreground leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/30">
                {setup.thesis}
              </p>

              {/* Peer Review Summary & Action */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-4 text-muted-foreground font-mono text-[11px]">
                  <span>Clarity: <strong className="text-foreground">{avgClarity}/5</strong></span>
                  <span>Risk Mgmt: <strong className="text-foreground">{avgRisk}/5</strong></span>
                  <span>Reviews: <strong className="text-foreground">{setup.peerReviews.length}</strong></span>
                </div>
                <button
                  onClick={() => setReviewingSetupId(reviewingSetupId === setup.id ? null : setup.id)}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs font-semibold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {reviewingSetupId === setup.id ? 'Close Reviews' : 'Leave Peer Review'}
                </button>
              </div>

              {/* Peer Reviews Listing & Input */}
              {reviewingSetupId === setup.id && (
                <div className="mt-3 p-3.5 rounded-lg bg-background border border-border/70 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-primary" /> Pedagogical Reviews & Critiques
                  </h4>

                  {setup.peerReviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No peer reviews yet. Be the first to critique this setup.</p>
                  ) : (
                    <div className="space-y-2">
                      {setup.peerReviews.map((rev) => (
                        <div key={rev.id} className="p-2.5 rounded bg-card/60 border border-border/40 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                            <span className="font-bold text-foreground">@{rev.reviewerHandle}</span>
                            <span>Clarity {rev.clarityScore}/5 · Risk {rev.riskManagementScore}/5</span>
                          </div>
                          <p className="text-muted-foreground">{rev.pedagogicalComment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Review Form */}
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Reviewer Handle</label>
                        <input
                          type="text"
                          value={reviewerHandle}
                          onChange={(e) => setReviewerHandle(e.target.value)}
                          className="w-full text-xs p-1.5 rounded border border-input bg-card font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Clarity (1-5)</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={clarityScore}
                          onChange={(e) => setClarityScore(parseInt(e.target.value) || 5)}
                          className="w-full text-xs p-1.5 rounded border border-input bg-card font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Risk Discipline (1-5)</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={riskScore}
                          onChange={(e) => setRiskScore(parseInt(e.target.value) || 5)}
                          className="w-full text-xs p-1.5 rounded border border-input bg-card font-mono"
                        />
                      </div>
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={2}
                      placeholder="Constructive feedback on structure, liquidity sweep, and stop loss validity..."
                      className="w-full text-xs p-2 rounded border border-input bg-card"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddReview(setup.id)}
                        disabled={!reviewComment.trim()}
                        className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
