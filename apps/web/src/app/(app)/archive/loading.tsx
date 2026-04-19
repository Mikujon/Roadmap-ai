export default function Loading() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s ease infinite;
          border-radius: 8px;
        }
      `}</style>
      <div style={{ padding: "28px 32px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Header skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 300, height: 16 }} />
          </div>
          <div className="skeleton" style={{ width: 120, height: 40, borderRadius: 10 }} />
        </div>
        {/* KPI cards skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 24 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
              <div className="skeleton" style={{ width: "60%", height: 10, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: "40%", height: 28 }} />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9" }}>
            <div className="skeleton" style={{ width: 120, height: 12 }} />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
              <div className="skeleton" style={{ width: 160, height: 14 }} />
              <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 20 }} />
              <div className="skeleton" style={{ width: 60, height: 14 }} />
              <div className="skeleton" style={{ width: 100, height: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 80, height: 14, marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}