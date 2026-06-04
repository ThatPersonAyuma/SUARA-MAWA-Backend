export type OptResult = {
    status: "success" | "fail",
    message: String
}

export const PAGE_SIZE = 10;
export const isNumeric = (val: string): boolean => !isNaN(Number(val)) && isFinite(Number(val));
