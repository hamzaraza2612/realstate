using FluentValidation;

namespace RealEstateErp.Application.Finance.Journal;

public class CreateJournalEntryRequestValidator : AbstractValidator<CreateJournalEntryRequest>
{
    private const decimal Tolerance = 0.01m;

    public CreateJournalEntryRequestValidator()
    {
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Lines).Must(lines => lines.Count >= 2)
            .WithMessage("A journal entry needs at least two lines.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.AccountId).NotEmpty();
            line.RuleFor(l => l.Debit).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l.Credit).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l).Must(l => (l.Debit > 0) ^ (l.Credit > 0))
                .WithMessage("Each line must have either a debit or a credit amount, not both and not neither.");
        });
        RuleFor(x => x.Lines).Must(lines => Math.Abs(lines.Sum(l => l.Debit) - lines.Sum(l => l.Credit)) <= Tolerance)
            .WithMessage("Total debits must equal total credits.")
            .When(x => x.Lines.Count > 0);
    }
}
