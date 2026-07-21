import Link from "next/link";
import styles from "./page.module.css";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">Social Media Builder</Link>
        <nav aria-label="Legal links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Publish with intent</p>
        <h1>One workspace for content that travels.</h1>
        <p className={styles.lede}>
          Social Media Builder helps creators prepare, review, and publish their
          own media to connected social accounts, including TikTok.
        </p>
        <div className={styles.actions}>
          <a className={styles.connect} href="/api/tiktok/login">Connect TikTok</a>
          <span>Uses TikTok Login Kit · You approve every permission</span>
        </div>
        {error && <p className={styles.loginError}>TikTok connection was not completed. Check the configured scopes and try again.</p>}
      </section>

      <section className={styles.workflow} aria-label="Publishing workflow">
        <article>
          <span>Prepare</span>
          <p>Add a video and the caption you want to publish.</p>
        </article>
        <article>
          <span>Review</span>
          <p>Confirm the content, destination account, and privacy settings.</p>
        </article>
        <article>
          <span>Publish</span>
          <p>Authorize TikTok and send the approved post from your workspace.</p>
        </article>
      </section>

      <footer className={styles.footer}>
        <span>Social Media Builder by Calis Content</span>
        <span>Creator-controlled publishing</span>
      </footer>
    </main>
  );
}
