import { FaDownload } from "react-icons/fa";

interface DownloadButtonProps {
  url?: string;
  label: string;
  printMode?: boolean;
}

export default function DownloadButton({
  url,
  label,
  printMode = false,
}: DownloadButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (printMode) {
      e.preventDefault();
      window.print();
    }
  };

  return (
    <a
      href={url || "#"}
      download={!printMode}
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.3rem 0.7rem",
        backgroundColor: "#3b82f6",
        color: "white",
        borderRadius: "0.5rem",
        textDecoration: "none",
        fontWeight: "500",
        transition: "background-color 0.2s",
        marginTop: "1rem",
        marginBottom: "1rem",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#2563eb";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#3b82f6";
      }}
    >
      <FaDownload />
      <span>{label}</span>
    </a>
  );
}
