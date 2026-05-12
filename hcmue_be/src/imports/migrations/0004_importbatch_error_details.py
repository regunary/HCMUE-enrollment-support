from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('imports', '0003_alter_importbatchlog_import_batch'),
    ]

    operations = [
        migrations.AddField(
            model_name='importbatch',
            name='error_details',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
