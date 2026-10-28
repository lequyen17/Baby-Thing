import { Link, NavLink } from 'react-router-dom';
import { LogoMark } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../utils/format';
import { CONTENT_LIST, POLICY_LIST } from './pages';

/** Khung trang nội dung công khai: xem được cả khi chưa đăng nhập. */
export function ContentLayout({ children }) {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <LogoMark />
            <span>Baby Things</span>
          </Link>
          <nav className="content-nav" aria-label="Thông tin">
            <NavLink to="/about">Giới thiệu</NavLink>
            <NavLink to="/guide/buy">Hướng dẫn mua</NavLink>
            <NavLink to="/guide/sell">Hướng dẫn bán</NavLink>
            <NavLink to="/fees">Bảng phí</NavLink>
            <NavLink to="/faq">Hỏi đáp</NavLink>
          </nav>
          {user ? (
            <Link to="/" className="btn btn-dark btn-sm">
              Về trang chủ
            </Link>
          ) : (
            <Link to="/login" className="btn btn-dark btn-sm">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <div className="app-footer-grid footer-3">
          <div className="footer-brand">
            <span className="serif">Baby Things</span>
            <p>Nền tảng C2C mua bán đồ mẹ &amp; bé đã qua sử dụng.</p>
          </div>
          <div className="footer-col">
            <strong>Hướng dẫn</strong>
            {CONTENT_LIST.filter((p) => !p.policy).map((p) => (
              <Link key={p.key} to={p.path}>
                {p.title}
              </Link>
            ))}
          </div>
          <div className="footer-col">
            <strong>Chính sách</strong>
            {POLICY_LIST.map((p) => (
              <Link key={p.key} to={p.path}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
        <div className="app-footer-bottom">© {new Date().getFullYear()} Baby Things.</div>
      </footer>
    </div>
  );
}

function Section({ section }) {
  return (
    <section className="doc-section">
      <h2>{section.h}</h2>
      {section.p?.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {section.list && (
        <ul>
          {section.list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ContentPage({ page }) {
  return (
    <ContentLayout>
      <div className={`doc${page.policy ? '' : ' no-side'}`}>
        {page.policy && (
          <aside className="doc-side" aria-label="Chính sách">
            <strong>Chính sách</strong>
            {POLICY_LIST.map((p) => (
              <NavLink key={p.key} to={p.path}>
                {p.title}
              </NavLink>
            ))}
          </aside>
        )}
        <article className="card doc-body">
          <h1 className="serif">{page.title}</h1>
          {page.policy && (
            <p className="doc-meta">
              Phiên bản {page.version} · Có hiệu lực từ {formatDate(page.effective, true)}
            </p>
          )}
          <p className="doc-intro">{page.intro}</p>

          {page.table && (
            <div className="table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    {page.table.head.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.table.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {page.sections?.map((s) => (
            <Section key={s.h} section={s} />
          ))}

          {page.faq && (
            <div className="faq">
              {page.faq.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          )}
        </article>
      </div>
    </ContentLayout>
  );
}
