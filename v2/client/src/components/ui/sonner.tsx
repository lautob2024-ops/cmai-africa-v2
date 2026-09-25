import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => <Sonner position="top-center" richColors closeButton {...props} />;

export { Toaster };
