import { FaPrayingHands } from "react-icons/fa";
import { MdWavingHand } from "react-icons/md";
import { RiBookOpenFill, RiBuilding2Fill } from "react-icons/ri";
import type { IconType } from "react-icons";

export const practiceNames: Record<string, string> = {
  okiyome: "Okiyome",
  omairi: "Omairi",
  leitura: "Leitura",
  frequencia_sede: "Frequência na Sede",
};
export const practiceIcons: Record<string, IconType> = {
  okiyome: MdWavingHand,
  omairi: FaPrayingHands,
  leitura: RiBookOpenFill,
  frequencia_sede: RiBuilding2Fill,
};
export type PracticeLog = { practiceKey: string; date: string };
