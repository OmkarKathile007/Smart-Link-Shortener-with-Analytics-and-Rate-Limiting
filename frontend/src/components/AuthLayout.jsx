import styles from "./AuthLayout.module.css";

export default function AuthLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      {/* Animated background orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      {/* Noise/grid overlay */}
      <div className={styles.grid} />

      <div className={styles.inner}>{children}</div>
    </div>
  );
}
