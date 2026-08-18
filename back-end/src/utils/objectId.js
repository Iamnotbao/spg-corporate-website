import { ObjectId } from "mongodb";

export function toObjectId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}
