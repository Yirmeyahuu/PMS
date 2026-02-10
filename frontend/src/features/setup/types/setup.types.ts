export interface SetupOption {
  id: string;
  label: string;
  component: React.ComponentType;
}

export interface SetupCard {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  options: SetupOption[];
}