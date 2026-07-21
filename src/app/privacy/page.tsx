import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = { title: "Privacy Policy | Social Media Builder" };

export default function PrivacyPolicy() {
  return <main className={styles.page}>
    <header className={styles.header}><Link className={styles.brand} href="/">Social Media Builder</Link><Link className={styles.back} href="/terms">Terms</Link></header>
    <article className={styles.article}>
      <p>Legal / Privacy</p><h1>Privacy Policy</h1><p className={styles.updated}>Effective July 21, 2026</p>
      <section><h2>Overview</h2><p>Social Media Builder helps users prepare and publish their own content to social platforms. This policy explains what information the service processes and why.</p></section>
      <section><h2>Information we process</h2><ul><li>Account identifiers and authorization tokens returned by connected platforms.</li><li>Videos, captions, publishing preferences, and status information you provide.</li><li>Basic technical logs needed for security, reliability, and troubleshooting.</li></ul></section>
      <section><h2>How information is used</h2><p>Information is used only to provide requested publishing features, maintain the service, prevent abuse, and meet legal obligations. We do not sell personal information.</p></section>
      <section><h2>TikTok data</h2><p>TikTok authorization data is used to connect the account selected by the user and perform actions the user explicitly requests. Access can be revoked from TikTok account settings.</p></section>
      <section><h2>Retention and security</h2><p>We retain information only as long as needed for the purposes described above. We apply access controls, encrypted transport, and secret-management practices appropriate to the information processed.</p></section>
      <section><h2>Your choices</h2><p>You may disconnect a social account, revoke platform authorization, or request deletion of service data by contacting <a href="mailto:quythi.gpt@gmail.com">quythi.gpt@gmail.com</a>.</p></section>
      <section><h2>Changes</h2><p>We may update this policy as the service changes. The effective date above identifies the current version.</p></section>
    </article>
  </main>;
}
