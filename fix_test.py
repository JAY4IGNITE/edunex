import re
with open("frontend/src/test/interaction.test.tsx", "r") as f:
    content = f.read()

# Replace user.type with user.selectOptions
content = content.replace(
    'await user.type(screen.getByLabelText("Department"), "CSE");',
    'await user.selectOptions(screen.getByLabelText("Department"), "Computer Science");'
)

# And replace the expectation to expect Computer Science instead of CSE
content = content.replace(
    '"department=CSE",',
    '"department=Computer+Science",'
)

with open("frontend/src/test/interaction.test.tsx", "w") as f:
    f.write(content)
