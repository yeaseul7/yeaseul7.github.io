import { FaGithub, FaEnvelope, FaGlobe } from "react-icons/fa";

interface ContactLinkProps {
  type: "github" | "email" | "web";
  url: string;
  label: string;
}

const iconMap = {
  github: FaGithub,
  email: FaEnvelope,
  web: FaGlobe,
};

export default function ContactLink({ type, url, label }: ContactLinkProps) {
  const Icon = iconMap[type];

  // 이메일의 경우 mailto: 제거하고 실제 이메일 주소만 표시
  const displayUrl = type === "email" ? url.replace("mailto:", "") : url;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.5rem",
      }}
    >
      <Icon style={{ display: "inline-block", verticalAlign: "middle" }} />
      <span>
        {label}. <a href={url}>{displayUrl}</a>
      </span>
    </div>
  );
}
