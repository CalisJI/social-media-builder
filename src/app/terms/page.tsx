import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = { title: "Terms of Service | Social Media Builder" };

export default function TermsOfService() {
  return <main className={styles.page}>
    <header className={styles.header}><Link className={styles.brand} href="/">Social Media Builder</Link><Link className={styles.back} href="/privacy">Privacy</Link></header>
    <article className={styles.article}>
      <p>Legal / Terms</p><h1>Terms of Service</h1><p className={styles.updated}>Effective July 21, 2026</p>
      <section><h2>Agreement</h2><p>Social Media Builder is operated by Calis Content. By using the service, you agree to these terms. If you do not agree, do not use the service.</p></section>
      <section><h2>Your accounts and content</h2><p>You are responsible for the accounts you connect and the content you submit. You retain ownership of your content and grant the service only the permission needed to process and publish it at your direction.</p></section>
      <section><h2>Acceptable use</h2><p>You must not use the service to violate law, platform rules, intellectual property rights, privacy rights, or the security of any system. You must have authority to publish all submitted content.</p></section>
      <section><h2>Third-party platforms</h2><p>Publishing depends on services such as TikTok. Their terms, availability, review processes, and technical limits also apply. We do not control those services.</p></section>
      <section><h2>Service availability</h2><p>The service may change, pause, or end as features and platform requirements evolve. It is provided without guarantees of uninterrupted or error-free operation.</p></section>
      <section><h2>Limitation of liability</h2><p>To the extent permitted by law, Calis Content is not liable for indirect, incidental, special, or consequential losses resulting from use of the service.</p></section>
      <section><h2>Contact</h2><p>Questions about these terms can be sent to <a href="mailto:support.calis@chillpickle.org">support.calis@chillpickle.org</a>.</p></section>
    </article>
  </main>;
}
