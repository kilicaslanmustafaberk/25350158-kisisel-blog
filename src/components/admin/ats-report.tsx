import type { AtsRuleResult, AtsScore } from "@/features/cv/ats-rules";

const statusLabel: Record<AtsRuleResult["status"], string> = { pass: "Geçti", warning: "Uyarı", fail: "Başarısız" };

export function AtsReport({ results, score }: { results: AtsRuleResult[]; score: AtsScore }) {
  const applicable = results.filter((result) => result.applicable);
  const passed = applicable.filter((result) => result.status === "pass");
  const warnings = applicable.filter((result) => result.status === "warning");
  const failed = applicable.filter((result) => result.status === "fail");

  return (
    <section className="media-manager" aria-labelledby="ats-title">
      <div>
        <p className="eyebrow">ATS Uyum Kontrolü</p>
        <h2 id="ats-title">Site içi ATS Uyumluluk Skoru: {score.score} / 100</h2>
        <p>
          Bu skor, bu projede tanımlanan deterministik kontrol kurallarına göre hesaplanan bir uyumluluk göstergesidir; gerçek işveren ATS
          sisteminin (LinkedIn, Workday vb.) verdiği skor değildir. Yalnızca format, içerik bütünlüğü, okunabilirlik ve standart bölüm
          kullanımı gibi genel ATS dostu kriterleri kontrol eder; belirli bir şirketin proprietary ATS algoritmasını simüle etmez.
        </p>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Kural</th>
              <th>Açıklama</th>
              <th>Ağırlık</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id}>
                <td>{result.title}</td>
                <td>{result.description}</td>
                <td>{result.weight}</td>
                <td>{result.applicable ? statusLabel[result.status] : "Uygulanamaz"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="form-grid">
        <div>
          <strong>Geçti ({passed.length})</strong>
          <ul>
            {passed.map((result) => (
              <li key={result.id}>{result.title}</li>
            ))}
          </ul>
        </div>
        {warnings.length > 0 && (
          <div>
            <strong>Uyarılar ({warnings.length})</strong>
            <ul>
              {warnings.map((result) => (
                <li key={result.id}>{result.title}</li>
              ))}
            </ul>
          </div>
        )}
        {failed.length > 0 && (
          <div>
            <strong>Başarısız ({failed.length})</strong>
            <ul>
              {failed.map((result) => (
                <li key={result.id}>{result.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
