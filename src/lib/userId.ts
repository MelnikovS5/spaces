let _userId: string | null = null;

export function setUserId(id: string | null) {
  _userId = id;
}

export function getUserId(): string | null {
  return _userId;
}
