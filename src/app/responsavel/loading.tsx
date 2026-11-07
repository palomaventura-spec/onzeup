import PageLoading from "@/components/PageLoading";
import styles from "./PlayerLoading.module.css";

export default function Loading() {
  return (
    <div className={styles.surface}>
      <PageLoading label="Carregando 11UP Player..." />
    </div>
  );
}
