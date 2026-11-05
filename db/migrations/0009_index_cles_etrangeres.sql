CREATE INDEX "business_cards_batch_idx" ON "business_cards" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "companies_owner_idx" ON "companies" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "company_referents_company_idx" ON "company_referents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "lead_batches_assignment_idx" ON "lead_batches" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "leads_batch_idx" ON "leads" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "password_resets_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payouts_freelancer_idx" ON "payouts" USING btree ("freelancer_id");