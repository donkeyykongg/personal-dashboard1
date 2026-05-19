import styles from "./dashboard-title.module.css";

export function DashboardTitle({ children = "My Dashboard" }: { children?: React.ReactNode }) {
  return <h1 className={styles.title}>{children}</h1>;
}

export default DashboardTitle;
