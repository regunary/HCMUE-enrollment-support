# Generated manually for admission API model alignment.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0004_alter_admissionconditionlog_admission_condition_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='majorcombination',
            old_name='dgnl_offset',
            new_name='score_offset',
        ),
        migrations.RenameField(
            model_name='majorcombinationlog',
            old_name='dgnl_offset',
            new_name='score_offset',
        ),
        migrations.AddField(
            model_name='admissioncondition',
            name='condition_json',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='admissionconditionlog',
            name='condition_json',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
