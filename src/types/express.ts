import { User } from "@supabase/supabase-js";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

export interface AuthenticatedRequest extends Request {
  user: User;
}

export type AuthenticatedHandler = RequestHandler<
  ParamsDictionary,
  any,
  any,
  ParsedQs,
  Record<string, any>
>;

export const createHandler = (
  handler: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => Promise<any> | any
): AuthenticatedHandler => {
  return (req, res, next) => {
    try {
      return Promise.resolve(handler(req as AuthenticatedRequest, res, next));
    } catch (error) {
      return next(error);
    }
  };
};
