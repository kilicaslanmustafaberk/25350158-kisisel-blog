import { SpineAnchor, SpineLane } from "@/components/motion/spine-lane";
import { ArrowUpRightIcon, CodeIcon } from "@/components/ui/icons";
import type { GitHubProfileDTO } from "@/features/github/profile";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

function formatPushed(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : { iso: date.toISOString(), label: dateFormat.format(date) };
}

/**
 * GitHub section. `profile` is the narrow server DTO (or null when the API is
 * unavailable); `profileUrl` is always derived from configuration, so the
 * section degrades to a plain link instead of breaking the landing page.
 * Phase 14: the section is a region of the page-wide Data Spine — the repo
 * panel hangs off the GitHub hub instead of sitting beside a decorative object.
 */
export function GitHubSection({ profile, profileUrl, username, cue }: { profile: GitHubProfileDTO | null; profileUrl: string; username: string; cue?: string }) {
  return <section className="spine-section github-section" id="github" aria-labelledby="github-title" data-spine-section data-spine-sequence="">
    <div className="site-container spine-grid" data-pin-scene="">
      <div className="spine-col spine-col--left">
        {profile && <div className="github-body">
          <dl className="github-stats">
            <div><dt>Kullanıcı</dt><dd>@{profile.username}</dd></div>
            <div><dt>Açık depo</dt><dd>{profile.publicRepoCount}</dd></div>
          </dl>
          {profile.repositories.length > 0
            ? <ul className="github-repos" aria-label="Son güncellenen public repository'ler">
              {profile.repositories.map((repo) => {
                const pushed = formatPushed(repo.pushedAt);
                return <li key={repo.url} data-spine-item="">
                  <SpineAnchor tick />
                  <h3><a href={repo.url} target="_blank" rel="noopener noreferrer"><CodeIcon />{repo.name}<span className="sr-only"> (yeni sekmede açılır)</span><ArrowUpRightIcon className="github-repo-arrow" /></a></h3>
                  {repo.description && <p>{repo.description}</p>}
                  <p className="github-repo-meta">
                    {repo.language && <span>{repo.language}</span>}
                    {pushed && <span>Son güncelleme <time dateTime={pushed.iso}>{pushed.label}</time></span>}
                  </p>
                </li>;
              })}
            </ul>
            : <p className="github-empty" data-spine-item=""><SpineAnchor />Listelenecek aktif, fork olmayan public repository bulunmuyor.</p>}
        </div>}
        {!profile && <p className="github-fallback" data-spine-item=""><SpineAnchor /><a className="button button-secondary" href={profileUrl} target="_blank" rel="noopener noreferrer">github.com/{username}<span className="sr-only"> (yeni sekmede açılır)</span> <ArrowUpRightIcon /></a></p>}
      </div>
      <SpineLane id="github" />
      <div className="spine-col spine-col--right">
        <div className="section-heading" data-reveal>
          {cue && <span className="chapter-cue" aria-hidden="true">{cue}</span>}
          <p className="eyebrow">GitHub</p>
          <h2 id="github-title">Açık kaynakta son çalışmalar.</h2>
          <p>{profile ? "GitHub üzerindeki güncel çalışmalarım." : "Çalışmalarımın tamamını GitHub profilimde inceleyebilirsiniz."}</p>
          <a className="button button-secondary" href={profileUrl} target="_blank" rel="noopener noreferrer">Profili görüntüle<span className="sr-only"> (GitHub, yeni sekmede açılır)</span> <ArrowUpRightIcon /></a>
        </div>
      </div>
    </div>
  </section>;
}
