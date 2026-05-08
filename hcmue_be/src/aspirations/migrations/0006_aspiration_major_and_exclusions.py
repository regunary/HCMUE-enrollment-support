# Generated manually for admission API model alignment.

import django.db.models.deletion
from django.db import migrations, models

import core.base_model
import core.choices


def populate_aspiration_major(apps, schema_editor):
    Aspiration = apps.get_model('aspirations', 'Aspiration')
    AspirationLog = apps.get_model('aspirations', 'AspirationLog')
    MajorCombination = apps.get_model('programs', 'MajorCombination')

    combination_to_major = dict(MajorCombination.objects.values_list('id', 'major_id'))
    for aspiration in Aspiration.objects.all().only('id', 'major_combination_id', 'major_id'):
        major_id = combination_to_major.get(aspiration.major_combination_id)
        if major_id:
            aspiration.major_id = major_id
            aspiration.save(update_fields=['major'])

    for log in AspirationLog.objects.all().only('id', 'major_combination_id', 'major_id'):
        major_id = combination_to_major.get(log.major_combination_id)
        if major_id:
            log.major_id = major_id
            log.save(update_fields=['major_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('aspirations', '0005_alter_admissionresultlog_admission_result_and_more'),
        ('candidates', '0008_priorityobject_remove_regionpriority_special_code_and_more'),
        ('programs', '0005_rename_score_offset_and_condition_json'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExcludedCandidate',
            fields=[
                ('action', models.CharField(choices=core.choices.ActionsChoices.choices, default=core.choices.ActionsChoices.CREATE, max_length=10)),
                ('field_changed', models.CharField(blank=True, max_length=500, null=True)),
                ('create_date', models.DateTimeField(auto_now_add=True)),
                ('update_date', models.DateTimeField(auto_now=True)),
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.TextField()),
                ('candidate', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='exclusion', to='candidates.candidate')),
            ],
            options={
                'db_table': 'excluded_candidate',
                'abstract': False,
            },
            bases=(core.base_model.AuditModel,),
        ),
        migrations.CreateModel(
            name='ExcludedCandidateLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('candidate_id', models.UUIDField()),
                ('cccd', models.CharField(max_length=12)),
                ('reason', models.TextField()),
                ('action', models.CharField(choices=core.choices.ActionsChoices.choices, max_length=10)),
                ('field_changed', models.CharField(blank=True, max_length=500, null=True)),
                ('create_date', models.DateTimeField(auto_now_add=True)),
                ('excluded_candidate', models.ForeignKey(blank=True, db_column='excluded_candidate_id', null=True, on_delete=django.db.models.deletion.SET_NULL, to='aspirations.excludedcandidate')),
            ],
            options={
                'db_table': 'excluded_candidate_log',
            },
        ),
        migrations.RemoveConstraint(
            model_name='aspiration',
            name='uq_aspiration_major_combination',
        ),
        migrations.RemoveIndex(
            model_name='aspiration',
            name='aspiration_major_c_37b3b2_idx',
        ),
        migrations.AddField(
            model_name='aspiration',
            name='major',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='aspirations', to='programs.major'),
        ),
        migrations.AddField(
            model_name='aspirationlog',
            name='major_id',
            field=models.CharField(default='', max_length=10),
        ),
        migrations.RunPython(populate_aspiration_major, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='aspiration',
            name='major',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='aspirations', to='programs.major'),
        ),
        migrations.AlterField(
            model_name='aspirationlog',
            name='major_id',
            field=models.CharField(max_length=10),
        ),
        migrations.RemoveField(
            model_name='aspiration',
            name='major_combination',
        ),
        migrations.RemoveField(
            model_name='aspirationlog',
            name='major_combination_id',
        ),
        migrations.AddIndex(
            model_name='aspiration',
            index=models.Index(fields=['major', 'computed_score'], name='aspiration_major_score_idx'),
        ),
        migrations.AddConstraint(
            model_name='aspiration',
            constraint=models.UniqueConstraint(fields=('candidate', 'major'), name='uq_aspiration_major'),
        ),
    ]
