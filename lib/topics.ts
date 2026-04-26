export const TOPIC_ORDER = [
  "Health",
  "Education",
  "Economy",
  "Poverty & inequality",
  "Environment & energy",
  "Infrastructure & digital",
  "Demographics",
  "Governance",
] as const;

export type Topic = (typeof TOPIC_ORDER)[number];

export const TOPIC_COLORS: Record<string, string> = {
  "Health":                   "bg-[#EAF3DE] text-[#27500A]",
  "Education":                "bg-[#E3EDFB] text-[#0C3B75]",
  "Economy":                  "bg-[#FFF3D9] text-[#633806]",
  "Poverty & inequality":     "bg-[#FCEBEB] text-[#791F1F]",
  "Environment & energy":     "bg-[#E6F4F1] text-[#14493E]",
  "Infrastructure & digital": "bg-[#EDE9FB] text-[#2D2475]",
  "Demographics":             "bg-[#F4F0E8] text-[#4A3B1A]",
  "Governance":               "bg-[#F0F0F0] text-[#333333]",
};
