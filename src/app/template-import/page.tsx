import TemplateImportForm from "./TemplateImportForm";
import styles from "./template-import.module.css";

export default function TemplateImportPage() {
  return <main className={styles.page}><section className={styles.card}>
    <p className={styles.eyebrow}>Template admin</p><h1>Import a video template</h1>
    <p>Baseline <code>vocabulary-dark-reference-v1</code> applies the supplied reference: dark gradient, progress dots, coral title, numbered badge, bullet copy and a code-style IPA block.</p>
    <TemplateImportForm />
  </section></main>;
}
