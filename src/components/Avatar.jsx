export default function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };
  return <div className={`grid shrink-0 place-items-center rounded-full bg-indigo-100 font-bold text-brand ${sizes[size]}`} aria-label={name}>{initials}</div>;
}
